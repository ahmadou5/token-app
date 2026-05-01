"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";

export function NativeStakeCard() {
  const { isConnected, account } = useWallet();
  const { fetchActiveStakes } = useStakeTransaction();
  const [apy, setApy] = useState<number | null>(null);
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://solanabeach.io/api/v1/epoch-info");
        if (res.ok) {
          const data = await res.json();
          // Solana Beach returns rewardRate as a fraction, e.g. 0.0712
          if (data.rewardRate) {
            setApy(data.rewardRate * 100);
          }
        }
      } catch (err) {
        console.error("Error fetching APY:", err);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (isConnected && account) {
      fetchActiveStakes(account).then(setStakes).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isConnected, account, fetchActiveStakes]);

  return (
    <div className="sw-card mt-6">
      <div className="sw-tabs">
        <div className="sw-tab sw-tab--active">
          <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Native Staking
        </div>
      </div>

      <div className="p-4 flex flex-direction-column gap-4">
        <div className="sw-earn-card__apy-box">
          <span className="sw-earn-card__apy-label">Network APY</span>
          <div className="sw-earn-card__apy-value">
            {apy ? `${apy.toFixed(2)}%` : "7.42%"}
          </div>
          <div className="sw-earn-card__provider-tag">Native SOL Delegation</div>
        </div>

        <p className="text-[12px] text-[var(--tc-text-muted)] leading-relaxed">
          Earn ~7% APY by delegating SOL to a network validator. Your SOL stays in your wallet's stake account — you control it.
        </p>

        {isConnected && stakes.length > 0 && (
          <div className="flex flex-direction-column gap-2 mt-2">
            <span className="text-[11px] font-semibold text-[var(--tc-text-secondary)] uppercase letter-spacing-[0.05em]">Your Stakes</span>
            {stakes.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-[var(--tc-bg-muted)] border border-[var(--tc-border)]">
                <div className="flex flex-direction-column">
                  <span className="text-[12px] font-medium text-[var(--tc-text-primary)]">{s.validator}</span>
                  <span className="text-[10px] text-[var(--tc-text-muted)]">{s.status}</span>
                </div>
                <span className="text-[12px] font-mono font-medium text-[var(--tc-text-primary)]">{s.amount} SOL</span>
              </div>
            ))}
          </div>
        )}

        <Link href="/validators" className="sw-swap-btn mt-2 no-underline text-center flex items-center justify-center gap-2">
          Choose a Validator
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div className="sw-powered">
        <span>Powered by Solana Native Staking</span>
      </div>
    </div>
  );
}
