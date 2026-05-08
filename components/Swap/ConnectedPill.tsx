"use client";

import { useEffect, useRef, useState } from "react";
import { useCluster, useConnector } from "@solana/connector/react";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { usePortfolioDrawer } from "@/context/PortfolioDrawerContext";
import { Check, TagChevronIcon } from "@phosphor-icons/react";
import { ClusterSelector } from "../connector/cluster-selector";
import { DropdownMenuLabel } from "../ui/dropdown-menu";
import type { SolanaClusterId, SolanaCluster } from '@solana/connector';
import { cn } from "@/lib/utils";


interface ConnectedPillProps {
  onDisconnect: () => void;
}


const clusterLabels: Record<string, string> = {
    'solana:mainnet': 'Mainnet',
    'solana:devnet': 'Devnet',
    'solana:testnet': 'Testnet',
    'solana:localnet': 'Localnet',
};

export function ConnectedPill({ onDisconnect }: ConnectedPillProps) {
  //const { selectedAccount, selectedWallet, wallets } = useConnector();
  const [open, setOpen] = useState(false);
  const { open: openPortfolio } = usePortfolioDrawer();
  const ref = useRef<HTMLDivElement>(null);
  const connector = useConnector();
    const { connected, connecting, selectedWallet, selectedAccount, disconnect, wallets, cluster } = connector;
    const { clusters, setCluster } = useCluster();

    const isMainnet = cluster?.id === 'solana:mainnet';

    const handleClusterChange = async (clusterId: SolanaClusterId) => {
        try {
            await setCluster(clusterId);
        } catch (error) {
            console.error('Cluster change failed:', error);
        }
    };
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
           <DropdownMenuLabel className="text-[11px] font-berkeley-mono text-sand-800 uppercase tracking-wide">
                        Network
                    </DropdownMenuLabel>
                    <div className="px-1 pb-1">
                        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                            {clusters.map((c: SolanaCluster) => {
                                const isSelected = c.id === cluster?.id;
                                const label = clusterLabels[c.id] || c.label || c.id;

                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => handleClusterChange(c.id as SolanaClusterId)}
                                        className={cn
                                          (
                                            'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-berkeley-mono transition-colors',
                                            isSelected
                                                ? 'border-sand-1500 bg-sand-1500 text-sand-100'
                                                : 'border-sand-200 bg-sand-100 text-sand-900 hover:border-sand-300 hover:bg-sand-200',
                                        )}
                                    >
                                        {label}
                                        {isSelected && <Check className="h-3 w-3" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {!isMainnet && (
                        <div className="px-2 py-1.5">
                            <p className="text-[11px] font-berkeley-mono text-sand-700 leading-relaxed">
                                <span className="text-amber-600">Note:</span> Some examples only work on mainnet.
                            </p>
                        </div>
                    )}
          <div className="sw-connected-menu__divider" />
          <button
            className="sw-connected-menu__portfolio"
            onClick={() => {
              setOpen(false);
              openPortfolio();
            }}
          >
            <TagChevronIcon />
            View Portfolio
          </button>
          

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
